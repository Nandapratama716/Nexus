package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nanda/nexus/core/domain"
	"github.com/nanda/nexus/core/infrastructure"
	"github.com/nanda/nexus/core/middleware"
)

type MenuHandler struct {
	menuUsecase     domain.MenuUsecase
	streamPublisher *infrastructure.MenuStreamPublisher
}

func NewMenuHandler(app fiber.Router, us domain.MenuUsecase, publisher *infrastructure.MenuStreamPublisher) {
	handler := &MenuHandler{
		menuUsecase:     us,
		streamPublisher: publisher,
	}

	menus := app.Group("/api/v1/menus")
	menus.Get("/", handler.GetAll)
	menus.Get("/:id", handler.GetByID)

	// Admin & Manager only
	menus.Post("/", middleware.JWTProtected(), middleware.RequireRole("admin", "manager"), handler.Create)
	menus.Put("/:id", middleware.JWTProtected(), middleware.RequireRole("admin", "manager"), handler.Update)
	menus.Delete("/:id", middleware.JWTProtected(), middleware.RequireRole("admin", "manager"), handler.Delete)
}

func (h *MenuHandler) GetAll(c *fiber.Ctx) error {
	menus, err := h.menuUsecase.GetAllMenus(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(menus)
}

func (h *MenuHandler) GetByID(c *fiber.Ctx) error {
	menu, err := h.menuUsecase.GetMenu(c.Context(), c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(menu)
}

func (h *MenuHandler) Create(c *fiber.Ctx) error {
	var menu domain.Menu
	if err := c.BodyParser(&menu); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format JSON tidak valid"})
	}
	if err := h.menuUsecase.CreateMenu(c.Context(), &menu); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Publish ke Redis Stream → AI Service akan update ChromaDB
	go h.streamPublisher.Publish(c.Context(), "create", menu.ID, menu)

	return c.Status(fiber.StatusCreated).JSON(menu)
}

func (h *MenuHandler) Update(c *fiber.Ctx) error {
	var menu domain.Menu
	if err := c.BodyParser(&menu); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format JSON tidak valid"})
	}
	menu.ID = c.Params("id")
	if err := h.menuUsecase.UpdateMenu(c.Context(), &menu); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Publish ke Redis Stream
	go h.streamPublisher.Publish(c.Context(), "update", menu.ID, menu)

	return c.JSON(fiber.Map{"message": "Menu berhasil diperbarui"})
}

func (h *MenuHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.menuUsecase.DeleteMenu(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Publish ke Redis Stream
	go h.streamPublisher.Publish(c.Context(), "delete", id, nil)

	return c.JSON(fiber.Map{"message": "Menu berhasil dihapus"})
}
